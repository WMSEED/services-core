import m from 'mithril';
import prop from 'mithril/stream';
import _ from 'underscore';
import h from '../h';
import { UserDetails } from '../entities';
import userVM from '../vms/user-vm';
import { loadUserBalance } from  '../root/users/edit/#balance/controllers/use-cases';
import { AdminTransferBalanceSuccess } from './admin-transfer-balance-success';
import { AdminTransferBalanceStart } from './admin-transfer-balance-start';
import { AdminTransferBalanceConfirm } from './admin-transfer-balance-confirm';
import { AdminTransferBalanceError } from './admin-transfer-balance-error';
import { I18nText } from '../shared/components/i18n-text';

enum TransferState {
    Start,
    Confirm,
    Success,
    Error,
    Loading,
}

const adminTransferBalance = {
    oninit: function(vnode) {
        let builder = vnode.attrs.data,
            complete = prop(false),
            error = prop(false),
            fail = prop(false),
            key = builder.property,
            senderKey = builder.propertySender,
            amountKey = builder.propertyAmount,
            receiverKey = builder.propertyReceiver,
            data = {},
            item = vnode.attrs.item as UserDetails;

        const fromUser = item;

        builder.requestOptions.config = (xhr) => {
            if (h.authenticityToken()) {
                xhr.setRequestHeader('X-CSRF-Token', h.authenticityToken());
            }
        };

        const transferState = h.RedrawStream<TransferState>(TransferState.Start);
        const l = prop(false),
            load = () => m.request(_.extend({}, { data }, builder.requestOptions)),
            receiver = prop(''),
            amountValue = prop(''),
            error_message = prop(''),
            fromUserBalance = h.RedrawStream(0);

        loadUserBalance(fromUser).then(balance => fromUserBalance(balance.amount));

        const requestError = (err) => {
            l(false);
            error_message(err.errors[0]);
            complete(true);
            error(true);
            transferState(TransferState.Error);
        };
        const updateItem = (res) => {
            l(false);
            _.extend(item, res[0]);
            complete(true);
            transferState(TransferState.Success);
            error(false);
            loadUserBalance(fromUser).then(balance => fromUserBalance(balance.amount));
        };

        const start = (toUserId : number) => {
            transferState(TransferState.Loading);
            loadToUser(toUserId)
                .then(() => {
                    transferState(TransferState.Confirm);
                })
        }

        const submit = () => {
            l(true);
            data[key] = { [senderKey] : item.id,
                          [amountKey] : amountValue(),
                          [receiverKey] : receiver() };
            load().then(updateItem, requestError);
            return false;
        };

        const unload = () => {
            complete(false);
            error(false);
        };

        const toUser = h.RedrawStream<UserDetails>(null);

        const loadToUser = (toUserId : number) => {
            return userVM
                .fetchUser(toUserId, false)
                .then((toUserResult : UserDetails[]) => {
                    toUser(toUserResult[0]);
                })
        }

        vnode.state = {
            complete,
            error,
            error_message,
            l,
            receiver,
            amountValue,
            submit,
            toggler: h.toggleProp(false, true),
            unload,
            transferState,
            item,
            loadToUser,
            toUser,
            fromUser,
            start,
            fromUserBalance
        };
    },
    view: function({state, attrs}) {
        const data = attrs.data;
        const fromUser = state.item;
        const loadToUser = state.loadToUser;
        const toUser = state.toUser();
        const transferState : TransferState = state.transferState();
        const fromUserBalance = state.fromUserBalance();

        function transferStateComponent() {
            switch(transferState) {
                case TransferState.Loading:
                    return h.loader();
                case TransferState.Start:
                    return (
                        <AdminTransferBalanceStart
                            toUserId={state.receiver()}
                            transferValue={state.amountValue()}
                            onChangeToUserId={state.receiver}
                            onChangeTransferValue={state.amountValue}
                            fromUserBalance={fromUserBalance}
                            nextStep={() => state.start(state.receiver())} />
                    )
                case TransferState.Confirm:
                    return (
                        <AdminTransferBalanceConfirm
                            transferValue={state.amountValue()}
                            fromUser={fromUser}
                            toUser={toUser}
                            submit={state.submit}
                            backToStart={() => state.transferState(TransferState.Start)} />
                    )

                case TransferState.Success:
                    return (<AdminTransferBalanceSuccess fromUser={fromUser} toUser={toUser} transferValue={state.amountValue()} />)

                case TransferState.Error:
                    return (
                        <AdminTransferBalanceError errorMessage={state.error_message()} />
                    )
            }
        }

        return m('.w-col.w-col-2', [
            m('button.btn.btn-small.btn-terciary', {
                onclick: state.toggler.toggle
            }, data.outerLabel), (state.toggler()) ?
            m('.dropdown-list.card.u-radius.dropdown-list-medium.zindex-10', {
                onremove: state.unload
            }, [
                m('form.w-form', {
                    onsubmit: (event : Event) => event.preventDefault(),
                }, transferStateComponent())
            ]) : ''
        ]);
    }
};

export default adminTransferBalance;
